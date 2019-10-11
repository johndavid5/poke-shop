import { Component, OnInit } from '@angular/core';

import { ApiService, Category, Product } from './api.service';

import { MenuItemInfo, MenuItemType } from './MenuItemInfo';
import { CartItemInfo } from './CartItemInfo';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    public menu: Category;

    public menuItems: Array<MenuItemInfo>;

    public expanders: Map<string,MenuItemInfo>;

    public cartItems: Array<CartItemInfo>;

    public static START_DEPTH(): number {
        return 2;
    }


    constructor(private apiService: ApiService) {
        this.expanders = new Map<string,MenuItemInfo>();
    }

    ngOnInit() {
      this.apiService.getInventory()
      .subscribe(
      inventory => {

        let sWho = "AppComponent::ngOnInit().this.apiService.getInventory().subscribe()"

        this.menu = inventory

        console.log(`${sWho}(): Got from ApiService: this.menu = inventory = `, this.menu );

        // Make it easy on yourself:
        //   Flatten the menu tree into an array...
        //this.menuItems = [
        //  {id: 1, description: "A", visible: true}
        //  ,{id: 2, description: "B", visible: false}
        //  ,{id: 3, description: "C", visible: true}
        //];

        //console.log(`${sWho}(): this.menuItems = `, this.menuItems );

        this.menuItems = this.flattenMenu( this.menu, AppComponent.START_DEPTH(), this.expanders )

        console.log(`${sWho}(): this.menuItems = this.flattenMenu( this.menu ) = `, this.menuItems );

        this.cartItems = [
         { name: 'Sea Weed', sku: '1234567', cost: 0.10, path: './a/b/c' }
         ,{ name: 'Ramen', sku: '1234765', cost: 0.30, path: './a/b' }
         ,{ name: 'MSG', sku: '1234555', cost: 0.20, path: './a/b/d' }
        ];

      });

    }/* ngOnInit() */

    onMenuItemClick(menuItem: MenuItemInfo): void {

        let sWho = "AppComponent::onMenuItemClick";

        console.log(`${sWho}(): BEGIN: menuItem = `, menuItem );

        if( menuItem.type == MenuItemType.CATEGORY )
        {
            if( menuItem.expanded == false ){
                // Expand this category...
                this.expanders.set( menuItem.path, menuItem );
            }
            else if( menuItem.expanded == true ){
                // Collapse this category...
                this.expanders.delete( menuItem.path );
            }

            this.menuItems = this.flattenMenu( this.menu, AppComponent.START_DEPTH(), this.expanders )

            console.log(`${sWho}(): END: this.menuItems = this.flattenMenu( this.menu ) = `, this.menuItems );
        }

    }

    /* See https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects */
    flattenMenu(menu: Category, startDepth: number, expanders: Map<string,MenuItemInfo> ): MenuItemInfo[] {

        let sWho = "AppComponent::flattenMenu";

        console.log(`${sWho}(): startDepth = ${startDepth}, expanders = `, expanders );

        let result: MenuItemInfo[] = [];

        function recurse(cur /* Category */, depth: number, path: string){
            let sWho = "recurse";

            path += "/" + cur.name;

            let pathBackOne = AppComponent.pathBackOne( path ) 
            let pathBackTwo = AppComponent.pathBackOne( pathBackOne ) 

            console.log(`${sWho}(): depth = ${depth}, path = ${path}, pathBackOne = ${pathBackOne}, pathBackTwo = ${pathBackTwo}...`);
            console.log(`${sWho}(): cur.name = ${cur.name}, cur.sku = ${cur.sku}, cur.cost = ${cur.cost}, cur.children = `, cur.children );

            if( depth == startDepth ){
              if( cur.name && cur.sku && cur.cost ){
                // Looks like a PRODUCT, Moe...
                result.push( { type: MenuItemType.PRODUCT, depth: depth, name: cur.name, sku: cur.sku, cost: cur.cost, path: path, expanded: false } );
              }
              else{
                // Looks like a CATEGORY, Moe...
                let bExpanded:boolean = false;
                if( expanders.has( path ) ){
                    bExpanded = true;
                }
                result.push( { type: MenuItemType.CATEGORY, depth: depth, name: cur.name, sku: "", cost: -1, path: path, expanded: bExpanded } );
              }
            }/* if( depth == startDepth ) */
            else if( depth > startDepth ){
                //if( expanders.has( pathBackOne ) ){ 
                if( AppComponent.allParentsAreExpanders( expanders, path, depth, startDepth ) ){
                  if( cur.name && cur.sku && cur.cost ){ 
                    // Implying this is a PRODUCT which is a first generation child of one of the
                    //`expanders` collection (which are CATEGORY's), and thus should be displayed...
                    result.push( { type: MenuItemType.PRODUCT, depth: depth, name: cur.name, sku: cur.sku, cost: cur.cost, path: path, expanded: false } );
                  }
                  else {
                    // Looks like a CATEGORY, Moe...
                    let bExpanded:boolean = false;
                    if( expanders.has( path ) ){
                      bExpanded = true;
                    }
                    result.push( { type: MenuItemType.CATEGORY, depth: depth, name: cur.name, sku: "", cost: -1, path: path, expanded: bExpanded } );
                  }
                }/* if( expanders.has( pathBackOne ) ) */
            }

            if( cur.children ){
                cur.children.forEach( (child)=>{
                  recurse( child, depth+1, path )
                });
            }
            //else{
                //console.log(`${sWho}(): cur.name = ${cur.name}, cur.sku = ${cur.sku}, cur.cost = ${cur.cost}, cur.children = `, cur.children );
                // Base Case: a Product...
                //result.push( { type: 'PRODUCT', depth: depth, name: cur.name, sku: cur.sku, cost: cur.cost } );
            //} 

        }

        recurse(menu,1,"menu");
        return result;
    }

    get menuString(): string {
        return JSON.stringify(this.menu, null, ' ');
    }

    /** 
    * e.g., pathBackOne('menu/ALL/Base') = 'menu/ALL'
    */
    static pathBackOne( pathIn: string ): string {
        let iWhere:number = pathIn.lastIndexOf('/');
        if( iWhere > 0 ){
            return pathIn.substring(0, iWhere);
        }
        else{
            return pathIn;
        }
    }/* pathBackOne() */


    /* Returns true if all parent paths back to `startDepth` are in the `expanders` Map... */
    static allParentsAreExpanders( expanders: Map<string,MenuItemInfo>, path: string, depth: number, startDepth: number ): boolean {
        let sWho = "AppComponent::allParentsAreExpanders";

        console.log( '\t' + `${sWho}(): path = ${path}, depth = ${depth}, startDepth = ${depth}, expanders = `, expanders );

        let pathBackOne = path;
        let iDepth = depth;

        while( true ){

          iDepth--;

          if( iDepth < startDepth ){
            console.log( '\t' + '\t' + `${sWho}(): SHEMP: Moe, iDepth = ${iDepth} is less dhen dha startDepth, so exitin' dha loop, Moe...` );
            break;
          }

          pathBackOne = AppComponent.pathBackOne( pathBackOne );

          console.log( '\t' + '\t' + `${sWho}(): SHEMP: Moe, iDepth = ${iDepth}, pathBackOne = ${pathBackOne}...`);
         

          if( ! expanders.has( pathBackOne ) ){
            console.log( '\t' + '\t' + `${sWho}(): SHEMP: Moe, iDepth = ${iDepth}: SHEMP: Sorry, Moe, pathBackOne = ${pathBackOne} ain't in dha expanders Map, so retoynin' false...Sorry, gotta do it...!` );
            return false;
          }
          else {
            console.log( '\t' + '\t' + `${sWho}(): SHEMP: Moe, iDepth = ${iDepth}: SHEMP: Hey, Moe, pathBackOne = ${pathBackOne} is in dha expanders Map, so we can keep goin' widh dha loop, Moe...!` );
          }
        }

        console.log( '\t' + `${sWho}(): SHEMP: Good news, Moe, all dha pathBackOnes were expanders...retoynin' true...` );
        return true;
    }
}
